

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  Heading1,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";

type Props = {
  editor: Editor | null;
};

export default function Toolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="flex gap-1 flex-wrap mb-2">
      <Button onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive("bold") ? "default" : "outline"}>
        <BoldIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive("italic") ? "default" : "outline"}>
        <ItalicIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleUnderline().run()} variant={editor.isActive("underline") ? "default" : "outline"}>
        <UnderlineIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} variant={editor.isActive("heading", { level: 1 }) ? "default" : "outline"}>
        <Heading1 size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant={editor.isActive("bulletList") ? "default" : "outline"}>
        <ListIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} variant={editor.isActive("orderedList") ? "default" : "outline"}>
        <ListOrderedIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign("left").run()} variant={editor.isActive({ textAlign: "left" }) ? "default" : "outline"}>
        <AlignLeft size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign("center").run()} variant={editor.isActive({ textAlign: "center" }) ? "default" : "outline"}>
        <AlignCenter size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().setTextAlign("right").run()} variant={editor.isActive({ textAlign: "right" }) ? "default" : "outline"}>
        <AlignRight size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().toggleLink({ href: "#" }).run()} variant={editor.isActive("link") ? "default" : "outline"}>
        <LinkIcon size={16} />
      </Button>
      <Button onClick={() => editor.chain().focus().setImage({ src: prompt("Image URL") || "" }).run()} variant="outline">
        <ImageIcon size={16} />
      </Button>
    </div>
  );
}