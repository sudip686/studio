/** Large runtime assets live on the existing R2 origin in production. */
export function assetUrl(path:string){return `${(process.env.NEXT_PUBLIC_ASSET_BASE_URL||'').replace(/\/$/,'')}${path.startsWith('/')?path:`/${path}`}`;}
