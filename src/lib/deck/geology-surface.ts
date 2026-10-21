import * as THREE from 'three';

type MapUnit = {properties:{unit:string;color:string};geometry:{type:'MultiPolygon';coordinates:number[][][][]}};
export type GeologySurfaceData = {features:MapUnit[]};

/** Derived map polygons only. No source model vertices are changed or extruded. */
export function buildGeologySurface(data:GeologySurfaceData, origin:{easting:number;northing:number}, height:(x:number,z:number)=>number) {
  const group = new THREE.Group();
  group.name = 'Digitized geological map · approximate grid registration';
  const bounds = new THREE.Box3();
  for(const feature of data.features) {
    const positions:number[]=[];
    const toLocal=(p:number[])=>new THREE.Vector2(p[0]-origin.easting,origin.northing-p[1]);
    function triangle(a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2,depth=0) {
      const ab=a.distanceToSquared(b),bc=b.distanceToSquared(c),ca=c.distanceToSquared(a);
      if(Math.max(ab,bc,ca)>90*90 && depth<22) {
        if(ab>=bc&&ab>=ca){const m=a.clone().lerp(b,.5);triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}
        else if(bc>=ca){const m=b.clone().lerp(c,.5);triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}
        else {const m=c.clone().lerp(a,.5);triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}
        return;
      }
      for(const p of [a,b,c]) {
        const y=height(p.x,p.y)+2.5;
        positions.push(p.x,y,p.y);bounds.expandByPoint(new THREE.Vector3(p.x,y,p.y));
      }
    }
    for(const polygon of feature.geometry.coordinates) {
      const outer=polygon[0].slice(0,-1).map(toLocal);
      const holes=polygon.slice(1).map(r=>r.slice(0,-1).map(toLocal));
      if(outer.length<3)continue;
      const vertices=outer.concat(...holes);
      for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(outer,holes))triangle(vertices[a],vertices[b],vertices[c]);
    }
    if(!positions.length)continue;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.computeBoundingSphere();
    const material=new THREE.MeshBasicMaterial({color:feature.properties.color,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=feature.properties.unit;
    mesh.renderOrder=30;
    mesh.userData.tooltipItems=[{title:feature.properties.unit,rows:['Digitized project-map polygon.','Approximate printed-grid registration; not a surveyed contact.'],tone:feature.properties.color}];
    group.add(mesh);
  }
  return {group,bounds};
}
