import { render } from "preact";

import { ChatInterface } from "./pages/ChatInterface";
import "./index.css";

render(<ChatInterface />, document.getElementById("app")!);
