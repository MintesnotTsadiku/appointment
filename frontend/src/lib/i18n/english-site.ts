/**
 * The English groups a website page uses (`publicSite`, `bookingStates`; the list is in vite.config.ts),
 * registered by the website entry. The full application registers the whole catalog when it takes over.
 */
import websiteGroups from "virtual:english-site";
import { registerEnglish } from "./index";

registerEnglish(websiteGroups);
