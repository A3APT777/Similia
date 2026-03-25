/**
 * Иконки Similia — тонкие, уникальные, strokeWidth 1.25.
 * Используются в сайдбаре и других местах.
 */

const ic = "w-[17px] h-[17px]"
const s = { strokeWidth: 1.25, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

export const IconHome = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><rect x="2.5" y="2.5" width="6" height="7" rx="1.5"/><rect x="11.5" y="2.5" width="6" height="4" rx="1.5"/><rect x="2.5" y="12.5" width="6" height="5" rx="1.5"/><rect x="11.5" y="9.5" width="6" height="8" rx="1.5"/></svg>

export const IconBook = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><path d="M10 4.5C8 3 5.5 3 3 3.5v13c2.5-.5 5-.5 7 1 2-1.5 4.5-1.5 7-1V3.5c-2.5-.5-5-.5-7 1z"/><path d="M10 4.5v13"/><path d="M10 8c-.6-.8-1.5-1.2-2.5-1.2" opacity="0.5"/></svg>

export const IconAI = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><path d="M10 3L15.5 10 10 17 4.5 10z"/><path d="M4.5 10h11"/><path d="M7.5 3.5L10 10l2.5-6.5" opacity="0.5"/></svg>

export const IconUser = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><circle cx="9" cy="7" r="3"/><path d="M3 17.5c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5"/><line x1="15" y1="4" x2="15" y2="8"/><line x1="13" y1="6" x2="17" y2="6"/></svg>

export const IconSettings = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="14" x2="17" y2="14"/><circle cx="7" cy="6" r="2"/><circle cx="13" cy="14" r="2"/></svg>

export const IconReferral = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><circle cx="5" cy="10" r="2.5"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7.3 8.6C9 7.2 11 6.2 13.2 5.8"/><path d="M7.3 11.4C9 12.8 11 13.8 13.2 14.2"/></svg>

export const IconAdmin = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><path d="M10 2L3.5 5.5v4c0 4.5 3 8 6.5 9.5 3.5-1.5 6.5-5 6.5-9.5v-4z"/><path d="M7.5 10.5l2 2 3.5-4"/></svg>

export const IconFeedback = <svg className={ic} viewBox="0 0 20 20" fill="none" stroke="currentColor" {...s}><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1h-5l-3 3v-3H3a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M7 8.5l3 0" opacity="0.6"/><path d="M7 11l5 0" opacity="0.4"/></svg>
