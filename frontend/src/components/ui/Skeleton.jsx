import { cn } from "../../lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("rounded-[4px] bg-[#e8eaed]", className)}
      {...props}
    />
  )
}

export { Skeleton }
