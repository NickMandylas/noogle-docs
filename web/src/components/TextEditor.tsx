import { useCallback } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface TextEditorProps {}

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
  const wrapperRef = useCallback((wrapper: HTMLDivElement) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    new Quill(editor, {
      theme: "snow",
      modules: { toolbar: toolBarOptions },
    });
  }, []);

  return <div className="container" ref={wrapperRef}></div>;
};

export default TextEditor;
