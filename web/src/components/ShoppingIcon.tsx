import { useShoppingImage } from '../query/hooks'

// A shopping item's icon: its photo when it has one, otherwise the emoji.
// The photo is a private file, so it is shown through a short-lived link.
export function ShoppingIcon({
  emoji,
  imagePath,
  size = 40,
  dim = false,
  className = '',
}: {
  emoji: string
  imagePath?: string | null
  // Width and height of the square tile, in px.
  size?: number
  dim?: boolean
  className?: string
}) {
  const { data: link } = useShoppingImage(imagePath)
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center overflow-hidden rounded-xl bg-fill ${dim ? 'opacity-55' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      {imagePath && link ? (
        <img src={link} alt="" width={size} height={size} draggable={false} className="size-full object-cover" />
      ) : imagePath ? null : (
        emoji
      )}
    </span>
  )
}
