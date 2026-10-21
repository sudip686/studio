/** Shared presentation motion: move deliberately, then hold for explanation. */
export const cameraEase=(value:number)=>{
  const t=Math.max(0,Math.min(1,value));
  return t<.5?4*t*t*t:1-(-2*t+2)**3/2;
};

/** Resolution-only adaptation: never changes source geometry, counts or assays. */
export function createResolutionGovernor(initial:number){
  let ratio=Math.max(.75,Math.min(2,initial)),samples=0,total=0,slowWindows=0;
  return {sample(milliseconds:number):number{
    if(!Number.isFinite(milliseconds)||milliseconds<1||milliseconds>250)return ratio;
    total+=milliseconds;samples++;
    if(samples===90){
      slowWindows=total/samples>34?slowWindows+1:0;
      if(slowWindows>=2){ratio=Math.max(.75,Math.round((ratio-.25)*100)/100);slowWindows=0;}
      samples=0;total=0;
    }
    return ratio;
  }};
}
