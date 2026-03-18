import BaseColumn from "../columns/BaseColumn"
import BaseCollection from "./BaseCollection"
import type { SortingState } from "@tanstack/react-table"

export default class Roles extends BaseCollection {
  __title = "Roles"

  title = new BaseColumn({
    title: "Title",
    type: "json",
    i18n: true,
  })

  // @ts-expect-error - name is overridden as BaseColumn (field) instead of string (collection name)
  name = new BaseColumn({
    title: "Name",
  })

  description = new BaseColumn({
    title: "Description",
    textarea: true,
  })

  override __defaultSort: SortingState = [{ id: 'title', desc: false }] as SortingState

  constructor() {
    super("roles")
  }
}


