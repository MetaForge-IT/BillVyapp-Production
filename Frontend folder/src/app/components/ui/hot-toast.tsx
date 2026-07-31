import type { ReactElement, ReactNode } from "react";
import {
  Toaster as ReactHotToaster,
  toast as hotToast,
  type ToastOptions,
  type ToasterProps,
} from "react-hot-toast";

type AppToastOptions = ToastOptions & {
  description?: ReactNode;
};

type AppToastMessage = string | ReactElement;

function toastContent(message: AppToastMessage, description?: ReactNode): AppToastMessage {
  if (!description) return message;

  return (
    <div className="min-w-0">
      <p className="text-[13px] font-bold leading-5">{message}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-white/65">{description}</p>
    </div>
  );
}

function splitOptions(options?: AppToastOptions) {
  const { description, ...toastOptions } = options ?? {};
  return { description, toastOptions };
}

export const toast = {
  success(message: AppToastMessage, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast.success(toastContent(message, description), toastOptions);
  },
  error(message: AppToastMessage, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast.error(toastContent(message, description), toastOptions);
  },
  info(message: AppToastMessage, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast(toastContent(message, description), {
      icon: "ℹ️",
      ...toastOptions,
    });
  },
  loading(message: AppToastMessage, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast.loading(toastContent(message, description), toastOptions);
  },
  dismiss: hotToast.dismiss,
  remove: hotToast.remove,
  promise: hotToast.promise,
  custom: hotToast.custom,
};

export function Toaster(props: ToasterProps) {
  const supplied = props.toastOptions ?? {};

  return (
    <ReactHotToaster
      gutter={10}
      containerStyle={{ zIndex: 10000, ...props.containerStyle }}
      {...props}
      toastOptions={{
        duration: 3500,
        ...supplied,
        style: {
          maxWidth: 420,
          borderRadius: 14,
          border: "1px solid rgba(212,175,55,0.28)",
          background: "#111118",
          color: "#fff",
          padding: "12px 14px",
          boxShadow: "0 14px 40px rgba(0,0,0,0.24)",
          ...supplied.style,
        },
        success: {
          iconTheme: { primary: "#D4AF37", secondary: "#111118" },
          ...supplied.success,
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
          ...supplied.error,
        },
      }}
    />
  );
}
