import { useCallback, useEffect, useState } from "react";
import Quill, {
  RangeStatic,
  SelectionChangeHandler,
  TextChangeHandler,
} from "quill";
import Delta from "quill-delta";
import { useParams } from "react-router-dom";
import isUUID from "validator/es/lib/isUUID";
import QuillCursors, { Cursor } from "quill-cursors";
import "quill/dist/quill.snow.css";

interface TextEditorProps {}

type NoogleMessage = {
  type: string;
  delta: Delta;
};

type NoogleCursor = {
  type: string;
  cursor: Cursor;
};

type NoogleSelection = {
  type: string;
  selection: {
    id: string;
    name: string;
    range: RangeStatic;
  };
};

type NoogleUser = {
  id: string;
  name: string;
};

const toolBarOptions = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["blockquote", "code-block"],
  ["clean"],
];

const TextEditor: React.FC<TextEditorProps> = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [quill, setQull] = useState<Quill | null>(null);
  const [cursors, setCursors] = useState<QuillCursors | null>(null);
  const [user, setUser] = useState<NoogleUser | null>(null);

  // Page Load -- Initiate WebSocket
  useEffect(() => {
    const s = new WebSocket("ws://192.168.114.163:4000");

    setSocket(s);

    const id = String(Math.round(Math.random() * 1000));
    setUser({ id: id, name: id });

    return () => {
      s.close();
    };
  }, []);

  useEffect(() => {
    const check = isUUID(documentId);
    if (!check && socket && quill) {
      socket.close(); // Kill socket connection if UUID isn't valid.
      setSocket(null); // TODO - Display error.
      quill.setText("Error: Invalid Document ID");
    }
  }, [documentId, socket, quill]);

  // Request Document Data -- When Socket Opens
  useEffect(() => {
    if (quill && socket) {
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "retrieve-document",
            message: { id: documentId },
          }),
        );
    }
  }, [socket, quill, documentId]);

  // Text Change -- Send Text Update to Server
  useEffect(() => {
    if (quill && socket) {
      const handler: TextChangeHandler = (delta, _, source) => {
        if (source !== "user") return;
        socket.send(
          JSON.stringify({
            type: "send-updates",
            message: { id: documentId, delta: delta },
          }),
        );
      };

      quill.on("text-change", handler);

      return () => {
        quill.off("text-change", handler);
      };
    }
  }, [socket, quill, documentId]);

  // Selection Change -- Send Selection Update to Server
  useEffect(() => {
    if (quill && cursors && socket && user) {
      const handler: SelectionChangeHandler = (range, _, source) => {
        if (source !== "user") return;
        socket.send(
          JSON.stringify({
            type: "send-cursor",
            message: {
              range: range,
              id: documentId,
              userId: user.id,
              name: user.name,
            },
          }),
        );
      };

      quill.on("selection-change", handler);

      return () => {
        quill.off("selection-change", handler);
      };
    }
  }, [quill, cursors, socket, documentId, user]);

  useEffect(() => {
    if (quill && socket) {
      const interval = setInterval(() => {
        socket.send(
          JSON.stringify({
            type: "save-document",
            message: { id: documentId, delta: quill.getContents() },
          }),
        );
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [socket, quill, documentId]);

  // Retrieve Changes/Updates from Server
  useEffect(() => {
    if (quill && socket) {
      const handler = (delta: Delta) => {
        quill.updateContents(delta);
      };

      socket.onmessage = (event) => {
        const message: NoogleMessage = JSON.parse(event.data);

        switch (message.type) {
          case "load-document":
            quill.setContents(message.delta);
            quill.enable();
            break;

          case "received-updates":
            handler(message.delta);
            break;
        }
      };
    }
  }, [socket, quill]);

  // useEffect(() => {
  //   if (quill && socket && cursors) {
  //     socket.onmessage = (event) => {
  //       const cursor: NoogleCursor = JSON.parse(event.data);

  //       switch (cursor.type) {
  //         case "received-cursor":
  //           console.log(cursors.cursors);
  //           break;
  //       }
  //     };
  //   }
  // }, [quill, socket, cursors]);

  const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    Quill.register("modules/cursors", QuillCursors);

    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: toolBarOptions, cursors: true },
    });

    q.disable();
    q.setText("Loading...");

    const c = q.getModule("cursors") as QuillCursors;

    setQull(q);
    setCursors(c);
  }, []);

  return (
    <div>
      <div className="container" ref={wrapperRef}></div>
    </div>
  );
};

export default TextEditor;
