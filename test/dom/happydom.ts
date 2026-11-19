// bun test preload: a DOM (custom elements, shadow roots, focus) for the
// component tests. Tests that stub globals (register.test.ts) restore them.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
