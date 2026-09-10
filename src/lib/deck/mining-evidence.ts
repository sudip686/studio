import {inside, type CandidatePit} from './site-planning';

export type EvidenceInterval={holeId:string;depthFrom:number;from:[number,number,number];to:[number,number,number]};
/** Select by spatial coverage, never highest assay. Coordinates are local metres. */
export function selectPitEvidenceHoles(intervals:EvidenceInterval[],pits:CandidatePit[],perPit=4){
  const collars=new Map<string,EvidenceInterval>();
  for(const interval of intervals){
    if(![...interval.from,...interval.to].every(Number.isFinite))continue;
    const prior=collars.get(interval.holeId);
    if(!prior||interval.depthFrom<prior.depthFrom)collars.set(interval.holeId,interval);
  }
  const ids=new Set<string>();
  for(const pit of [...pits].sort((a,b)=>a.centre[1]-b.centre[1])){
    const eligible=[...collars.values()].filter(s=>inside([s.from[0],s.from[2]],pit.ring)).sort((a,b)=>a.from[2]-b.from[2]||a.holeId.localeCompare(b.holeId));
    const n=Math.min(perPit,eligible.length);
    for(let i=0;i<n;i++)ids.add(eligible[n===1?0:Math.round(i*(eligible.length-1)/(n-1))].holeId);
  }
  return [...ids];
}
