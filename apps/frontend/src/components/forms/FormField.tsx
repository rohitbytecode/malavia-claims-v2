import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>; }
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="input textarea" {...props} />; }
export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="input" {...props} />; }
