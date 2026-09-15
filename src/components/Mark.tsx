/** The Geo Detect mark: a map sheet split by the seam.
 *
 *  The vertical accent line is the same gesture as the auth panel's sweep and
 *  the dashboard's comparison divider — before on one side, after on the other.
 *  The blocks either side are what changed across it: a footprint that appeared,
 *  a carriageway that widened. A stock satellite glyph says "space"; this says
 *  what the product actually does.
 *
 *  The graticule strokes use currentColor so the mark tints with its context;
 *  everything that means CHANGE stays accent green.
 */
export default function Mark({ size = 22, className }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <g stroke="currentColor" strokeWidth="1.25" opacity="0.32">
                <path d="M3 11h26M3 16h26M3 21h26" />
            </g>
            <path d="M16 2.5v27" stroke="#10b981" strokeWidth="1.75" />
            <g fill="#10b981">
                <rect x="18.5" y="8" width="4.5" height="4.5" rx="0.5" />
                <rect x="18.5" y="18.75" width="7" height="3" rx="0.5" />
            </g>
            <g stroke="#10b981" strokeWidth="1.25" opacity="0.45">
                <rect x="8" y="9" width="5" height="5" rx="0.5" />
                <circle cx="10.5" cy="21" r="2.5" />
            </g>
        </svg>
    );
}
