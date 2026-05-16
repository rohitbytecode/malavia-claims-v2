export function Skeleton({ rows = 4 }: { rows?: number }) { return <div className="skeleton-stack">{Array.from({ length: rows }, (_, index) => <div className="skeleton" key={index} />)}</div>; }
