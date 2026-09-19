/**
 * fox 行业页内插槽声明（基座 `IndustrySlots` 契约）。
 *
 * 只声明受管页面已开放的白名单插槽；路由与权限仍走 `routes.tsx`，两者互不替代。
 */
import { HomeQuestlineSlot } from "./HomeQuestlineSlot";

export const industrySlots = [
  { slot: "home.overlay", element: <HomeQuestlineSlot /> },
] as const;
