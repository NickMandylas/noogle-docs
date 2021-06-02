import React, { useState } from "react";
import short from "short-uuid";
import { NoogleUser } from "./TextEditor";

interface InputFormProps {
  userState: [
    NoogleUser | null,
    React.Dispatch<React.SetStateAction<NoogleUser | null>>,
  ];
}

const InputForm: React.FC<InputFormProps> = ({ userState: [_, setUser] }) => {
  const [field, setField] = useState<string>("");

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const id = short().new();
    setUser({ id: String(id), name: field });
  };

  return (
    <div className="input-form">
      <form onSubmit={handleSubmit}>
        <p
          style={{
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          Name:
        </p>
        <input
          className="field"
          type="text"
          placeholder="Nick Webster"
          value={field}
          onChange={(e) => setField(e.target.value)}
        />
        <input className="button" type="submit" value="Submit" />
      </form>
    </div>
  );
};

export default InputForm;
