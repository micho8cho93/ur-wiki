import fs from "fs"
import { joinSegments, FilePath, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"

export const CoursePage: QuartzEmitterPlugin = () => ({
  name: "CoursePage",
  async *emit(ctx) {
    const src = joinSegments(ctx.argv.directory, "course/index.html") as FilePath
    const content = await fs.promises.readFile(src)

    yield write({
      ctx,
      slug: "course/index" as FullSlug,
      ext: ".html",
      content,
    })
  },
  async *partialEmit(ctx, _content, _resources, changeEvents) {
    if (!changeEvents.some((event) => event.path === "course/index.html")) return

    const src = joinSegments(ctx.argv.directory, "course/index.html") as FilePath
    const content = await fs.promises.readFile(src)

    yield write({
      ctx,
      slug: "course/index" as FullSlug,
      ext: ".html",
      content,
    })
  },
})
