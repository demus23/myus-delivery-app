import dbConnect from "@/lib/dbConnect";
import TrackingEvent from "@/lib/models/TrackingEvent";
import Package from "@/lib/models/Package";

type CreateEventInput = {
  packageId: string;
  trackingNo: string;
  status: string;
  location?: string;
  note?: string;
  actorId?: string;
  actorName?: string;
};

export async function createTrackingEvent(input: CreateEventInput) {
  await dbConnect();

  const ev = await TrackingEvent.create({
    packageId: input.packageId,
    trackingNo: input.trackingNo,
    status: input.status,
    location: input.location || "",
    note: input.note || "",
    actorId: input.actorId || "",
    actorName: input.actorName || "",
  });

  await Package.findByIdAndUpdate(input.packageId, {
    $set: {
      status: input.status,
      lastLocation: input.location || "",
      lastNote: input.note || "",
      lastUpdatedAt: new Date(),
    },
  });

  return ev;
}
