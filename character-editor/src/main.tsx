import { render } from "preact";

import { CharacterEditor } from "./components/CharacterEditor";
import "./styles/index.css";

render(<CharacterEditor />, document.getElementById("app")!);
