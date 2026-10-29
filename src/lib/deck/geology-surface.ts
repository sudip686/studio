import * as THREE from 'three';

type MapUnit = {properties:{unit:string;color:string;opacity?:number;basis?:string};geometry:{type:'MultiPolygon';coordinates:number[][][][]}};
export type GeologySurfaceData = {features:MapUnit[]};
export type GeologyRasterLayer = {
  unit:string;
  color:string;
  url:string;
  bounds:[number,number,number,number];
  basis?:string;
};
// VRIFY-style map emphasis: strong enough to read on satellite imagery while
// retaining the terrain texture beneath each mapped outcrop.
export const GEOLOGY_SURFACE_DEFAULT_OPACITY=.82;

/** Derived map polygons only. No source model vertices are changed or extruded. */
export function buildGeologySurface(data:GeologySurfaceData, origin:{easting:number;northing:number}, height:(x:number,z:number)=>number, extent:{width:number;depth:number;surveyed?:(x:number,z:number)=>boolean}) {
  const group = new THREE.Group();
  group.name = 'Digitized geological map · approximate grid registration';
  const bounds = new THREE.Box3();
  for(const feature of data.features) {
    const positions:number[]=[];
    const outline:number[]=[];
    const toLocal=(p:number[])=>new THREE.Vector2(p[0]-origin.easting,origin.northing-p[1]);
    const inExtent=(p:THREE.Vector2)=>(p.x>=-extent.width/2&&p.x<=extent.width/2&&p.y>=-extent.depth/2&&p.y<=extent.depth/2);
    const addBoundary=(ring:number[][])=>{
      const points=ring.slice(0,-1).map(toLocal);
      for(let i=0;i<points.length;i++){
        const start=points[i],end=points[(i+1)%points.length],length=start.distanceTo(end);
        const segments=Math.max(1,Math.ceil(length/30));
        for(let j=0;j<segments;j++){
          const a=start.clone().lerp(end,j/segments),b=start.clone().lerp(end,(j+1)/segments);
          if(!inExtent(a)||!inExtent(b))continue;
          const mid=a.clone().lerp(b,.5);
          const survey=extent.surveyed?.(a.x,a.y);
          if(extent.surveyed&&(extent.surveyed(b.x,b.y)!==survey||extent.surveyed(mid.x,mid.y)!==survey))continue;
          outline.push(a.x,height(a.x,a.y)+4,a.y,b.x,height(b.x,b.y)+4,b.y);
        }
      }
    };
    function triangle(a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2,depth=0) {
      const ab=a.distanceToSquared(b),bc=b.distanceToSquared(c),ca=c.distanceToSquared(a);
      const sourceA=extent.surveyed?.(a.x,a.y);
      const mixedSource=Boolean(extent.surveyed&&(extent.surveyed(b.x,b.y)!==sourceA||extent.surveyed(c.x,c.y)!==sourceA));
      if((Math.max(ab,bc,ca)>90*90||(mixedSource&&Math.max(ab,bc,ca)>12*12)) && depth<22) {
        if(ab>=bc&&ab>=ca){const m=a.clone().lerp(b,.5);triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}
        else if(bc>=ca){const m=b.clone().lerp(c,.5);triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}
        else {const m=c.clone().lerp(a,.5);triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}
        return;
      }
      if(mixedSource)return;
      // Clip mapped coverage to the existing terrain patch. Never stretch its
      // imagery or leave map polygons floating beyond the displayed ground.
      let clipped=[a,b,c];
      for(const [axis,edge,sign] of [['x',-extent.width/2,1],['x',extent.width/2,-1],['y',-extent.depth/2,1],['y',extent.depth/2,-1]] as const){
        const output:THREE.Vector2[]=[];
        for(let i=0;i<clipped.length;i++){
          const p=clipped[i],q=clipped[(i+1)%clipped.length];
          const pInside=(p[axis]-edge)*sign>=0,qInside=(q[axis]-edge)*sign>=0;
          if(pInside)output.push(p);
          if(pInside!==qInside)output.push(p.clone().lerp(q,(edge-p[axis])/(q[axis]-p[axis])));
        }
        clipped=output;if(clipped.length<3)return;
      }
      for(let i=1;i<clipped.length-1;i++){
        const vertices=[clipped[0],clipped[i],clipped[i+1]];
        for(const p of vertices) {
          const y=height(p.x,p.y)+2.5;
          positions.push(p.x,y,p.y);bounds.expandByPoint(new THREE.Vector3(p.x,y,p.y));
        }
      }
    }
    for(const polygon of feature.geometry.coordinates) {
      const sourceOuter=polygon[0].slice(0,-1);
      const outer=sourceOuter.map(toLocal);
      let area=0;
      for(let i=0;i<outer.length;i++){const a=outer[i],b=outer[(i+1)%outer.length];area+=a.x*b.y-b.x*a.y;}
      // Keep the presentation outline on substantial map units. Tiny raster
      // islands remain visible by colour without turning the view into a mesh.
      if(feature.properties.unit!=='Soil cover'&&Math.abs(area/2)>=25_000)addBoundary(polygon[0]);
      const holes=polygon.slice(1).map(r=>r.slice(0,-1).map(toLocal));
      if(outer.length<3)continue;
      const vertices=outer.concat(...holes);
      for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(outer,holes))triangle(vertices[a],vertices[b],vertices[c]);
    }
    if(!positions.length)continue;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.computeBoundingSphere();
    const material=new THREE.MeshBasicMaterial({color:feature.properties.color,transparent:true,opacity:GEOLOGY_SURFACE_DEFAULT_OPACITY,toneMapped:false,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=feature.properties.unit;
    mesh.renderOrder=feature.properties.unit==='Soil cover'?29:30;
    // Soil cover is a broad, pale base unit. Keep it perceptible as mapped
    // evidence without washing out the satellite texture or masking smaller
    // outcrops; the source opacity remains preserved in the GeoJSON.
    const presentationOpacity=feature.properties.unit==='Soil cover'?.52:1;
    mesh.userData.surfaceOpacityScale=(feature.properties.opacity??1)*presentationOpacity;
    mesh.userData.geologicUnit=feature.properties.unit;
    // Soil cover is a broad base overlay. If it overlaps an outcrop at the
    // same registered elevation, let the more specific rock class win clicks.
    mesh.userData.surfacePickPriority=feature.properties.unit==='Soil cover'?0:1;
    mesh.userData.tooltipItems=[{title:feature.properties.unit,rows:[feature.properties.basis??'Digitized project-map polygon.','Approximate printed-grid registration; not a surveyed contact.'],tone:feature.properties.color}];
    group.add(mesh);
    if(outline.length){
      const outlineGeometry=new THREE.BufferGeometry();
      outlineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(outline,3));
      // A quiet dark keyline keeps pale units readable over both bright ground
      // and forest imagery; the visible edge uses the source-map unit swatch
      // so adjoining contacts reinforce the legend instead of reading as one
      // unrelated white boundary network.
      const shadowGeometry=outlineGeometry.clone();
      const shadowPositions=shadowGeometry.getAttribute('position');
      for(let i=0;i<shadowPositions.count;i++)shadowPositions.setY(i,shadowPositions.getY(i)-1.5);
      shadowPositions.needsUpdate=true;
      const shadow=new THREE.LineSegments(shadowGeometry,new THREE.LineBasicMaterial({color:'#18241e',transparent:true,opacity:.46,depthWrite:false,toneMapped:false}));
      shadow.name=`${feature.properties.unit} · boundary keyline`;
      shadow.userData.geologicUnit=feature.properties.unit;
      shadow.renderOrder=30;
      group.add(shadow);
      const boundaries=new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:feature.properties.color,transparent:true,opacity:.88,depthWrite:false,toneMapped:false}));
      boundaries.name=`${feature.properties.unit} · mapped boundary`;
      boundaries.userData.geologicUnit=feature.properties.unit;
      boundaries.renderOrder=31;
      group.add(boundaries);
    }
  }
  return {group,bounds};
}

/**
 * Project a georeferenced, transparent lithology mask onto the same measured
 * terrain mesh used by the viewer. Source coordinates are EPSG:32737 and the
 * image bounds are [west, south, east, north].
 */
export function buildGeologyRasterSurface(
  layer:GeologyRasterLayer,
  texture:THREE.Texture,
  terrain:THREE.BufferGeometry,
  origin:{easting:number;northing:number},
) {
  const source=terrain.getAttribute('position');
  const positions=new Float32Array(source.count*3);
  const uv=new Float32Array(source.count*2);
  const [west,south,east,north]=layer.bounds;
  for(let i=0;i<source.count;i++){
    const x=source.getX(i),y=source.getY(i)+2.5,z=source.getZ(i);
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
    const easting=origin.easting+x;
    const northing=origin.northing-z;
    uv[i*2]=(easting-west)/(east-west);
    // TextureLoader flips image data for WebGL, so north maps to v=1.
    uv[i*2+1]=(northing-south)/(north-south);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const index=terrain.getIndex();
  if(index)geometry.setIndex(index.clone());
  geometry.computeBoundingSphere();
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.ClampToEdgeWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.generateMipmaps=true;
  const material=new THREE.MeshBasicMaterial({
    map:texture,
    transparent:true,
    opacity:1,
    alphaTest:.015,
    depthWrite:false,
    side:THREE.DoubleSide,
    toneMapped:false,
    polygonOffset:true,
    polygonOffsetFactor:-2,
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=`${layer.unit} · georeferenced lithology mask`;
  mesh.renderOrder=30;
  mesh.userData.geologicUnit=layer.unit;
  mesh.userData.surfaceOpacityScale=1;
  mesh.userData.sourceRaster=layer.url;
  mesh.userData.geologyRasterLayer=true;
  mesh.userData.tooltipItems=[{title:layer.unit,rows:[layer.basis??'User-supplied georeferenced lithology raster.','WGS 84 / UTM zone 37S; approximate source registration.'],tone:layer.color}];
  if(!terrain.boundingBox)terrain.computeBoundingBox();
  const terrainBounds=terrain.boundingBox??new THREE.Box3();
  const bounds=new THREE.Box3(
    new THREE.Vector3(Math.max(west-origin.easting,terrainBounds.min.x),terrainBounds.min.y+2.5,Math.max(origin.northing-north,terrainBounds.min.z)),
    new THREE.Vector3(Math.min(east-origin.easting,terrainBounds.max.x),terrainBounds.max.y+2.5,Math.min(origin.northing-south,terrainBounds.max.z)),
  );
  return {mesh,bounds};
}

/** A subtle 1 km UTM reference grid draped over the digitized surface-map bounds. */
export function buildGeologyReferenceGrid(bounds:THREE.Box3, origin:{easting:number;northing:number}, height:(x:number,z:number)=>number, spacing=1000) {
  if(bounds.isEmpty()||!Number.isFinite(spacing)||spacing<=0)return null;
  const minE=origin.easting+bounds.min.x,maxE=origin.easting+bounds.max.x;
  const minN=origin.northing-bounds.max.z,maxN=origin.northing-bounds.min.z;
  if(![minE,maxE,minN,maxN].every(Number.isFinite)||maxE<=minE||maxN<=minN)return null;
  const positions:number[]=[];
  const addLine=(axis:'easting'|'northing',coordinate:number,min:number,max:number)=>{
    const count=Math.max(1,Math.ceil((max-min)/50));
    for(let i=0;i<count;i++){
      const a=min+(max-min)*i/count,b=min+(max-min)*(i+1)/count;
      const eastA=axis==='easting'?coordinate:a,northA=axis==='northing'?coordinate:a;
      const eastB=axis==='easting'?coordinate:b,northB=axis==='northing'?coordinate:b;
      const ax=eastA-origin.easting,az=origin.northing-northA,bx=eastB-origin.easting,bz=origin.northing-northB;
      positions.push(ax,height(ax,az)+6,az,bx,height(bx,bz)+6,bz);
    }
  };
  for(let e=Math.ceil(minE/spacing)*spacing;e<=maxE;e+=spacing)addLine('easting',e,minN,maxN);
  for(let n=Math.ceil(minN/spacing)*spacing;n<=maxN;n+=spacing)addLine('northing',n,minE,maxE);
  if(!positions.length)return null;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const grid=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x26342c,transparent:true,opacity:.38,depthWrite:false,depthTest:true,toneMapped:false}));
  grid.name='UTM 37S · 1 km reference grid · approximate registration';
  grid.userData.geologicUnit='reference-grid';
  grid.renderOrder=32;
  return grid;
}
