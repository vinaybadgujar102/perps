import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterComponentProps = ToasterProps & {
  position?: ToasterProps["position"];
};

const Toaster = ({ position = "top-right", ...props }: ToasterComponentProps) => {
  return (
    <Sonner
      theme="dark"
      position={position}
      offset={20}
      gap={8}
      className="terminal-toaster"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "p-0 bg-transparent border-0 shadow-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
