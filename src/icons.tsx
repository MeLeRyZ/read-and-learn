const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const svg = (d: React.ReactNode) => () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P}>
    {d}
  </svg>
)

export const Back = svg(<path d="M15 18l-6-6 6-6" />)
export const Book = svg(<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />)
export const Type = svg(<path d="M3 19l5-13 5 13M4.8 14.5h6.4M15 19l3.2-8 3.2 8M15.9 16.8h4.6" />)
export const List = svg(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />)
export const Bookmark = svg(<path d="M6 3.5h12v17l-6-4-6 4z" />)
export const Download = svg(<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />)
export const Upload = svg(<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14" />)
export const Trash = svg(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />)

export const BookmarkFilled = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...P} fill="currentColor">
    <path d="M6 3.5h12v17l-6-4-6 4z" />
  </svg>
)
