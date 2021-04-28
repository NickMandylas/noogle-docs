import { useCallback, useEffect, useState } from "react";
import Quill, { TextChangeHandler } from "quill";
import Delta from "quill-delta";
import { useParams } from "react-router-dom";
import "quill/dist/quill.snow.css";

interface TextEditorProps {}

type NoogleMessage = {
  type: string;
  delta: Delta;
};

const toolBarOptions = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

const TextEditor: React.FC<TextEditorProps> = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [quill, setQull] = useState<Quill | null>(null);

  // Page Load -- Initiate WebSocket
  useEffect(() => {
    const s = new WebSocket("ws://192.168.114.163:4000");

    setSocket(s);

    return () => {
      s.close();
    };
  }, []);

  // Request Document Data -- When Socket Opens
  useEffect(() => {
    if (quill && socket) {
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "retrieve-document",
            message: documentId,
          }),
        );
    }
  }, [socket, quill, documentId]);

  // Text Change -- Send Update to Server
  useEffect(() => {
    if (quill && socket) {
      const handler: TextChangeHandler = (delta, oldDeta, source) => {
        if (source !== "user") return;
        socket.send(
          JSON.stringify({
            type: "send-updates",
            message: delta,
          }),
        );
      };

      quill.on("text-change", handler);

      return () => {
        quill.off("text-change", handler);
      };
    }
  }, [socket, quill]);

  // Retrieve Changes/Updates from Server
  useEffect(() => {
    if (quill && socket) {
      const handler = (delta: Delta) => {
        quill.updateContents(delta);
      };

      socket.onmessage = (event) => {
        const message: NoogleMessage = JSON.parse(event.data);
        console.log(message.type + "all");

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

  const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: toolBarOptions },
    });

    q.disable();
    q.setText("Loading...");

    setQull(q);
  }, []);

  return <div className="container" ref={wrapperRef}></div>;
};

export default TextEditor;
