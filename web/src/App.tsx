import TextEditor from "./components/TextEditor";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { v4 } from "uuid";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <Redirect to={`/document/${v4()}`} />
        </Route>
        <Route path="/document" exact>
          <Redirect to={`/document/${v4()}`} />
        </Route>
        <Route path="/document/:id">
          <TextEditor />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
