import { useEffect, useState } from "react";

const pad = (value: number) => value.toString().padStart(2, "0");

const formatTime = (date: Date) =>
  `${pad(date.getHours())} : ${pad(date.getMinutes())} : ${pad(
    date.getSeconds()
  )}`;

export const useCurrentTime = () => {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return time;
};
