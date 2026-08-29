/** Rubba mark — genie lamp with future energy from the spout. */
export default function RubbaMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      className={`rubba-mark ${className}`.trim()}
      src={`${import.meta.env.BASE_URL}rubba-lamp.svg`}
      alt=""
      width={size}
      height={size}
      decoding="async"
    />
  );
}
