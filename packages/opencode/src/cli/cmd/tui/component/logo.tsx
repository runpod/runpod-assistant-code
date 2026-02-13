import { RGBA } from "@opentui/core"
import { For } from "solid-js"
import { logo } from "@/cli/logo"

// Runpod brand purple (#af5fff)
const PURPLE = RGBA.fromInts(175, 95, 255)

export function Logo() {
  return (
    <box>
      <For each={logo}>
        {(line) => (
          <box>
            <text fg={PURPLE} selectable={false}>
              {line}
            </text>
          </box>
        )}
      </For>
    </box>
  )
}
