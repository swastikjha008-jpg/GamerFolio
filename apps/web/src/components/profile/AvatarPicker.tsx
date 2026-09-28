"use client";

import { Camera, Check, Upload } from "lucide-react";
import { useRef } from "react";
import { avatarOptions } from "@/data/mockAppData";

export function AvatarPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (file?: File) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="avatar-picker">
      <div className="avatar-preview-wrap">
        <div className="avatar-preview">
          <img alt="Selected avatar preview" src={selected} />
        </div>
        <span className="avatar-status"><span /> Ready to use</span>
      </div>
      <div className="avatar-choice-panel">
        <div className="avatar-choice-heading">
          <div>
            <strong>Choose your identity</strong>
            <span>Pick a look or upload your own profile picture.</span>
          </div>
          <Camera size={19} />
        </div>
        <div className="avatar-options">
          {avatarOptions.map((avatar) => (
            <button
              aria-label="Choose this avatar"
              className={`avatar-option ${selected === avatar ? "is-selected" : ""}`}
              key={avatar}
              onClick={() => onChange(avatar)}
              type="button"
            >
              <img alt="" src={avatar} />
              {selected === avatar ? <span><Check size={13} /></span> : null}
            </button>
          ))}
        </div>
        <button className="avatar-upload" onClick={() => fileRef.current?.click()} type="button">
          <Upload size={17} />
          Upload profile picture
        </button>
      </div>
      <input
        accept="image/*"
        className="visually-hidden"
        onChange={(event) => handleUpload(event.target.files?.[0])}
        ref={fileRef}
        type="file"
      />
    </div>
  );
}
