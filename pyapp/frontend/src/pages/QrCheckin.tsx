import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { checkinAPI } from "../services/api";
import { Icon } from "../components/Icon";
import QRScanner from "../components/QRScanner";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { cn } from "../utils";
import { useSearchParams } from "react-router-dom";

export default function QrCheckin() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const [searchParams] = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    hubId: string;
    hubName: string;
    checkInTime: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualId, setManualId] = useState("");
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [cameraStatus, setCameraStatus] = useState<"unknown" | "granted" | "denied">("unknown");

  const canCreateCheckIns = user && checkPermission("check_ins:create");
  const prefilledHubId = searchParams.get("hub");

  // Fetch today's check-ins
  const { data: checkIns, refetch: refetchCheckIns } = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const response = await checkinAPI.getCheckIns({});
      return response.data?.items || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Find active (not checked out) check-in for today
  useEffect(() => {
    if (checkIns && checkIns.length > 0) {
      const today = new Date().toDateString();
      const active = checkIns.find((ci: any) => {
        const checkInDate = new Date(ci.check_in_time).toDateString();
        return checkInDate === today && !ci.check_out_time;
      });
      setActiveCheckIn(active || null);
    }
  }, [checkIns]);

  const handleDetected = useCallback(async (hubId: string) => {
    if (!hubId) return;
    if (activeCheckIn) {
      setError("Already checked in. Please check out first.");
      return;
    }
    setLoading(true);
    try {
      const result = await checkinAPI.createCheckIn({ hubId });
      setScanResult({
        hubId,
        hubName: result.data?.hub?.name || "Hub",
        checkInTime: result.data?.check_in_time || new Date().toISOString(),
        status: "success",
      });
      refetchCheckIns();
      setTimeout(() => {
        setScanResult(null);
      }, 2500);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Check-in failed. Please try again.";
      setError(msg);
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  }, [activeCheckIn, refetchCheckIns]);

  const handleScanWhileCheckedIn = useCallback(async (hubId: string) => {
    if (!hubId) return;
    setError("");
    setLoading(true);
    try {
      const result = await checkinAPI.createCheckIn({ hubId, override: true });
      setScanResult({
        hubId,
        hubName: result.data?.hub?.name || "Hub",
        checkInTime: result.data?.check_in_time || new Date().toISOString(),
        status: "success",
      });
      refetchCheckIns();
      setActiveCheckIn(null);
      setTimeout(() => {
        setScanResult(null);
      }, 2500);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Override check-in failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [refetchCheckIns]);

  useEffect(() => {
    if (canCreateCheckIns && prefilledHubId && !activeCheckIn && !scanResult && !loading) {
      handleDetected(prefilledHubId);
    }
  }, [activeCheckIn, canCreateCheckIns, handleDetected, loading, prefilledHubId, scanResult]);

  // Handle QR code scan
  const handleScan = useCallback(async (decodedText: string) => {
    if (!decodedText) return;

    // Stop scanning after successful detection
    setIsScanning(false);

    // QR code should contain the hub ID
    // Supports formats: plain UUID, "hub-{id}", or full URL with hub id
    let hubId = decodedText.trim();
    if (hubId.startsWith("http")) {
      try {
        const url = new URL(hubId);
        hubId = url.pathname.split("/").pop() || url.searchParams.get("hub") || hubId;
      } catch {
        // Not a valid URL; keep raw text
      }
    }

    if (activeCheckIn) {
      await handleScanWhileCheckedIn(hubId);
    } else {
      await handleDetected(hubId);
    }
  }, [activeCheckIn, handleDetected, handleScanWhileCheckedIn]);

  if (!canCreateCheckIns) {
    return (
      <div className="text-error">
        You don't have permission to perform check-ins
      </div>
    );
  }

  const handleCheckOut = async (checkinId: string) => {
    setLoading(true);
    setError("");
    try {
      await checkinAPI.checkOut(checkinId);
      refetchCheckIns();
      setActiveCheckIn(null);
    } catch (err: any) {
      setError("Check-out failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const manualCheckIn = () => {
    if (!manualId.trim()) {
      setError("Enter a Hub ID");
      return;
    }
    handleDetected(manualId.trim());
  };

  const todayCheckIns = (checkIns || []).filter((ci: any) => {
    const checkInDate = new Date(ci.check_in_time).toDateString();
    return checkInDate === new Date().toDateString();
  });

  return (
    <>
      <div className="max-w-5xl mx-auto mb-6">
        <div className="alert alert-info">
          <Icon name="info" className="w-5 h-5" />
          <span>
            <strong>QR Check-in function:</strong> Ambassadors scan the QR code displayed at a hub to
            record their physical attendance. A scan checks you <strong>in</strong>; you must scan again (or
            use <strong>Check Out</strong>) when leaving. Hub managers and admins use these check-in records
            to verify attendance and track hub engagement.
          </span>
        </div>
      </div>
      {scanResult ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="card bg-success/10 border border-success/30 p-8 text-center">
            <div className="text-6xl mb-4">
              <Icon name="completed" className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-success mb-2">
              Checked In!
            </h2>
            <p className="font-semibold">{scanResult.hubName}</p>
            <p className="text-sm text-base-content/60">
              {new Date(scanResult.checkInTime).toLocaleTimeString()}
            </p>
            <button
              onClick={() => setScanResult(null)}
              className="btn btn-primary mt-6"
            >
              Done
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="card bg-base-100 border border-base-300 p-6">
            <h3 className="font-semibold mb-4">QR Code Scanner</h3>
            
            {/* Camera Status Indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                cameraStatus === "granted" ? "bg-success" :
                cameraStatus === "denied" ? "bg-error" :
                "bg-warning"
              }`} />
              <span className="text-sm text-base-content/60">
                {cameraStatus === "granted" ? "Camera ready" :
                 cameraStatus === "denied" ? "Camera access denied" :
                 "Camera not enabled"}
              </span>
              <button 
                onClick={() => {
                  window.location.reload();
                }}
                className="btn btn-xs btn-ghost"
                title="Refresh to check camera status"
              >
                <Icon name="refresh" className="w-3 h-3" />
              </button>
            </div>
            
            <div className="relative bg-base-300 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
              {isScanning ? (
                <QRScanner
                  scanning={isScanning}
                  onScan={handleScan}
                  onError={(msg) => {
                    setCameraStatus("denied");
                    setError(msg);
                    setIsScanning(false);
                  }}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center text-base-content/40">
                  <Icon name="qr-code" className="w-16 h-16 mx-auto mb-2" />
                  <p>Camera is off</p>
                  <p className="text-sm mt-1">Click Start Scan to begin</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (isScanning) {
                  setIsScanning(false);
                  setCameraStatus("unknown");
                } else {
                  setError("");
                  setCameraStatus("granted");
                  setIsScanning(true);
                }
              }}
              className={cn(
                "btn w-full mt-4",
                isScanning ? "btn-secondary" : "btn-primary",
              )}
            >
              {isScanning ? (
                <>
                  <Icon name="stop" className="w-4 h-4 mr-1" /> Stop Scan
                </>
              ) : (
                <>
                  <Icon name="play" className="w-4 h-4 mr-1" /> Start Scan
                </>
              )}
            </button>

            {activeCheckIn && (
              <div className="card bg-warning/10 border border-warning/30 p-6 mt-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Icon name="clock" className="w-5 h-5" /> Currently Checked In
                </h3>
                <p className="text-sm text-base-content/70 mb-3">
                  Checked in at{" "}
                  {new Date(activeCheckIn.check_in_time).toLocaleTimeString()}{" "}
                  at {activeCheckIn.hub?.name || "Unknown Hub"}
                </p>
                <button
                  onClick={() => handleCheckOut(activeCheckIn.id)}
                  className="btn btn-warning w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <>
                      <Icon name="logout" className="w-4 h-4 mr-1" /> Check Out
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="card bg-base-100 border border-base-300 p-6 mt-4">
              <h3 className="font-semibold mb-4">Manual Check-in</h3>
              <p className="text-sm text-base-content/50 mb-4">
                If the camera is not working, enter a Hub ID to check in
                manually.
              </p>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="input input-bordered w-full mb-3"
                placeholder="e.g. hub UUID"
                onKeyDown={(e) => {
                  if (e.key === "Enter") manualCheckIn();
                }}
              />
              <button
                onClick={manualCheckIn}
                className="btn btn-secondary w-full"
                disabled={loading}
              >
                {loading && (
                  <span className="loading loading-spinner loading-sm" />
                )}{" "}
                Check In
              </button>
              {error && <div className="alert alert-error mt-4">{error}</div>}
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 p-6">
            <h3 className="font-semibold mb-4">Today's Check-ins</h3>
            {todayCheckIns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Hub</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayCheckIns.map((ci: any) => (
                      <tr key={ci.id}>
                        <td>{ci.hub?.name || "Unknown"}</td>
                        <td>
                          {new Date(ci.check_in_time).toLocaleTimeString()}
                        </td>
                        <td>
                          {ci.check_out_time
                            ? new Date(ci.check_out_time).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={cn(
                              "badge",
                              ci.check_out_time
                                ? "badge-neutral"
                                : "badge-success",
                            )}
                          >
                            {ci.check_out_time ? "Completed" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-base-content/50 text-center py-8">
                No check-ins today.
              </p>
            )}

            <div className="card bg-base-100 border border-base-300 p-6 mt-6">
              <h3 className="font-semibold mb-3">How to check-in</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-base-content/70 text-sm">
                <li>
                  Click <strong>Start Scan</strong> to activate your camera
                </li>
                <li>Point it at the QR code displayed at the hub</li>
                <li>Wait for the scanner to detect the code</li>
                <li>You will be checked in automatically</li>
                <li>If camera access fails, use the manual check-in option</li>
                <li>
                  Remember to <strong>check out</strong> before leaving
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
