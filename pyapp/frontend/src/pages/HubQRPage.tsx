import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { hubAPI } from "../services/api";
import { Icon } from "../components/Icon";

export default function HubQRPage() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const [qrText, setQrText] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: hub, isLoading } = useQuery({
    queryKey: ["hub", hubId],
    queryFn: async () => {
      const resp = await hubAPI.getHub(hubId!);
      return resp.data;
    },
    enabled: !!hubId,
  });

  useEffect(() => {
    if (hubId) {
      setQrText(`hub-${hubId}`);
    }
  }, [hubId]);

  const copyQr = async () => {
    try {
      await navigator.clipboard.writeText(qrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1505);
    } catch {
      /* ignore */
    }
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hub-${hubId}-qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!hubId || (isLoading && !hub)) {
    return (
      <div className="card bg-base-100 border border-base-300 ">
        <div className="card-body text-center">
          <h2 className="text-2xl font-bold">Hub QR</h2>
          <p className="text-base-content/60">Loading hub...</p>
        </div>
      </div>
    );
  }

  const hubData = hub as any;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Check-in QR</h2>
              <p className="text-base-content/60">
                {hubData?.name} — {hubData?.location}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={() => navigate(-1)}
            >
              <Icon name="back" className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200 p-6">
            <div className="flex flex-col items-center justify-center gap-4" ref={qrRef}>
              <div className="rounded-xl border border-base-300 bg-white p-4">
                <QRCode
                  value={qrText}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                />
              </div>
              <p className="text-sm text-base-content/60">
                Display this QR at the hub entrance. Ambassadors scan it to check in.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary gap-1"
              onClick={copyQr}
            >
              <Icon name="copy" className="w-4 h-4" />
              {copied ? "Copied" : "Copy Code"}
            </button>
            <button
              type="button"
              className="btn btn-secondary gap-1"
              onClick={downloadQr}
            >
              <Icon name="share" className="w-4 h-4" />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}