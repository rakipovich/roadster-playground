const paths={
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 free:'<path d="M12 12c-2-5-8-5-8 0s6 5 8 0 8-5 8 0-6 5-8 0Z"/>',
 music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5M12 17h.01"/>',
 gas:'<path d="M10 3h7a2 2 0 0 1 2 2l-3 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L8 5a2 2 0 0 1 2-2Z"/><path d="m11 7 4 0m-5 4h4m-5 4h4m-2 6v1"/>',
 brake:'<rect x="3" y="5" width="18" height="12" rx="3"/><path d="M7 8v6m5-6v6m5-6v6m-5 3v4h4"/>',
 jets:'<path d="m9 4-3 9h12l-3-9ZM9 17l-1 4m4-4v5m3-5 1 4"/>',
 grip:'<path d="M5 6h14v5H5zM8 3v3m8-3v3M8 13v5m-2-2 2 2 2-2m6-3v5m-2-2 2 2 2-2M3 21h18"/>',
 reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 4 12 8-12 8Z"/>',
 wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M3 10h7m4 0h7m-9 4v7"/>',
 view:'<path d="m4 10 2-5h12l2 5M3 10h18v8H3zM6 18v2m12-2v2M6 13h2m8 0h2"/>',
 sound:'<path d="m4 9 4 0 5-4v14l-5-4H4zM16 8q4 4 0 8m3-11q7 7 0 14"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
};
export function icon(name,{off=false}={}){return `<svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.help}${off?'<path d="m3 3 18 18"/>':''}</svg>`;}
