import { formatNetworkSpeed } from "./networkSpeed";

it("formats actual byte rates independently of media bitrate", () => {
  expect(formatNetworkSpeed(1_900_000)).toBe("1.9 MB/s");
  expect(formatNetworkSpeed(1000)).toBe("1.0 KB/s");
  expect(formatNetworkSpeed(0)).toBe("0 B/s");
  expect(formatNetworkSpeed(500)).toBe("500 B/s");
});
it.each([undefined, null, -1, NaN, Infinity])(
  "hides unavailable or invalid sample %s",
  (value) => {
    expect(formatNetworkSpeed(value)).toBeNull();
  },
);
