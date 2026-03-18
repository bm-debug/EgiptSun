import BaseColumn from "../columns/BaseColumn"
import BaseCollection from "./BaseCollection"

export default class Media extends BaseCollection {
  __title = "Media"

  uuid = new BaseColumn({ title: "UUID", hiddenTable: true })
  maid = new BaseColumn({ title: "MAID", hidden: true })
  title = new BaseColumn({ title: "Title", type: "text" })
  alt_text = new BaseColumn({ title: "Alt text", type: "text" })
  caption = new BaseColumn({ title: "Caption", type: "text" })
  file_name = new BaseColumn({ title: "File name", type: "text" })
  file_path = new BaseColumn({ title: "File path", hiddenTable: true })
  mime_type = new BaseColumn({ title: "MIME type", type: "text" })
  size_bytes = new BaseColumn({ title: "Size", type: "text" })
  is_public = new BaseColumn({ title: "Public", type: "boolean" })
  type = new BaseColumn({ title: "Type", type: "text" })
  uploader_aid = new BaseColumn({ title: "Uploader", hidden: true })
  url = new BaseColumn({ title: "URL", type: "text" })
  filename = new BaseColumn({ title: "Filename", type: "text" })
  filesize = new BaseColumn({ title: "Filesize", hidden: true })
  width = new BaseColumn({ title: "Width", hidden: true })
  height = new BaseColumn({ title: "Height", hidden: true })

  constructor() {
    super("media")
  }
}
