import { X } from "lucide-react";
import { VscFile } from "react-icons/vsc";
import { FcFolder } from "react-icons/fc";
import {
  SiTypescript,
  SiJavascript,
  SiReact,
  SiHtml5,
  SiCss3,
  SiPython,
} from "react-icons/si";
import { BiSolidFileJson } from "react-icons/bi";

interface FileMentionTagProps {
  path: string;
  type: "file" | "folder";
  onRemove: () => void;
}

const getFileIcon = (path: string, type: "file" | "folder") => {
  if (type === "folder") {
    return { icon: FcFolder, color: "inherit" };
  }

  const ext = path.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "ts":
      return { icon: SiTypescript, color: "#3178c6" };
    case "tsx":
      return { icon: SiReact, color: "#61dafb" };
    case "js":
    case "mjs":
    case "cjs":
      return { icon: SiJavascript, color: "#f7df1e" };
    case "jsx":
      return { icon: SiReact, color: "#61dafb" };
    case "html":
    case "htm":
      return { icon: SiHtml5, color: "#e34c26" };
    case "css":
      return { icon: SiCss3, color: "#9c5cb8" };
    case "json":
      return { icon: BiSolidFileJson, color: "#42a5f5" };
    case "py":
      return { icon: SiPython, color: "#3776ab" };
    default:
      return { icon: VscFile, color: "#6b7280" };
  }
};

export function FileMentionTag({ path, type, onRemove }: FileMentionTagProps) {
  const fileName = path.split("/").pop() || path;
  const { icon: IconComponent, color } = getFileIcon(path, type);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-accent border border-border rounded-md text-xs">
      <IconComponent className="h-3 w-3 flex-shrink-0" style={{ color }} />
      <span className="truncate max-w-[150px]">{fileName}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 cursor-pointer  rounded transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
