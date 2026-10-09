import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

loadFont({ family: "Geist", url: staticFile("fonts/GeistVF.woff"), weight: "100 900" });
loadFont({ family: "Geist Mono", url: staticFile("fonts/GeistMonoVF.woff"), weight: "100 900" });
