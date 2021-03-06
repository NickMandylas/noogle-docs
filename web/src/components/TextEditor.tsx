import { useCallback, useEffect, useState } from "react";
import Quill, {
  RangeStatic,
  SelectionChangeHandler,
  TextChangeHandler,
} from "quill";
import Delta from "quill-delta";
import { useParams } from "react-router-dom";
import isUUID from "validator/es/lib/isUUID";
import QuillCursors from "quill-cursors";
import { cursorColours, toolBarOptions } from "../constants";
import { ToastContainer, toast } from "react-toastify";
import InputForm from "./InputForm";

import "quill/dist/quill.snow.css";
import "react-toastify/dist/ReactToastify.css";

interface TextEditorProps {}

type NoogleMessage = {
  type: string;
  delta?: Delta;
  cursor?: {
    id: string;
    name: string;
    range: RangeStatic;
  };
};

export type NoogleUser = {
  id: string;
  name: string;
};

const cursorStore: string[] = [];

const TextEditor: React.FC<TextEditorProps> = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [quill, setQull] = useState<Quill | null>(null);
  const [cursors, setCursors] = useState<QuillCursors | null>(null);
  const [user, setUser] = useState<NoogleUser | null>(null);

  // Page Load -- Initiate WebSocket
  useEffect(() => {
    const s = new WebSocket("ws://localhost:4000");

    setSocket(s);

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
    if (quill && socket && user) {
      socket.send(
        JSON.stringify({
          type: "retrieve-document",
          message: { id: documentId, userId: user.id, name: user.name },
        }),
      );
    }
  }, [socket, quill, documentId, user]);

  // Text Change -- Send Text Update to Server
  useEffect(() => {
    if (quill && socket) {
      const handler: TextChangeHandler = (delta, _, source) => {
        if (source !== "user" || quill.isEnabled() === false) return;
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
        if (source !== "user" || quill.isEnabled() === false) return;
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
        if (socket.readyState === 2 || socket.readyState === 3) {
          clearInterval(interval);
          return;
        }

        if (quill.isEnabled() === true) {
          socket.send(
            JSON.stringify({
              type: "save-document",
              message: { id: documentId, delta: quill.getContents() },
            }),
          );
        }
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [socket, quill, documentId]);

  // Retrieve Changes/Updates from Server
  useEffect(() => {
    const newCursor = (cursor: { id: string; name: string }) => {
      if (cursors) {
        const cursorColour =
          cursorColours[Math.floor(Math.random() * cursorColours.length)];
        cursors.createCursor(cursor.id, cursor.name, cursorColour);
        cursors.toggleFlag(cursor.id, true);
        cursorStore.push(cursor.id);
      }
    };

    if (quill && socket && cursors) {
      const handler = (delta: Delta) => {
        quill.updateContents(delta);
      };

      socket.onmessage = (event) => {
        const message: NoogleMessage = JSON.parse(event.data);

        switch (message.type) {
          case "load-document":
            quill.setContents(message.delta!);
            quill.enable();

            break;

          case "received-updates":
            handler(message.delta!);
            break;

          case "new-cursor":
            if (message.cursor) {
              const cursor = message.cursor;
              newCursor(cursor);
              toast(`???? ${cursor.name} has entered the document.`);
            }
            break;

          case "received-cursor":
            if (message.cursor) {
              const cursor = message.cursor;
              if (!cursorStore.includes(cursor.id)) {
                newCursor(cursor);
              }
              cursors.moveCursor(cursor.id, cursor.range);
            }
            break;

          case "remove-cursor":
            if (message.cursor) {
              cursors.removeCursor(message.cursor.id);
              toast(`???????? ${message.cursor.name} has left the document.`);
            }
            break;

          case "invalid-document":
            quill.setText("Invalid Document ID");
            socket.close();
            break;
        }
      };
    }
  }, [socket, quill, cursors]);

  const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);

    Quill.register("modules/cursors", QuillCursors);

    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: toolBarOptions,
        cursors: { transformOnTextChange: true },
      },
    });

    q.disable();
    q.setText("Loading...");

    const c = q.getModule("cursors") as QuillCursors;

    setQull(q);
    setCursors(c);
  }, []);

  if (!user) {
    return <InputForm userState={[user, setUser]} />;
  }

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="container" ref={wrapperRef}></div>
    </div>
  );
};

export default TextEditor;
