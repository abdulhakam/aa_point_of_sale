import { useEffect, useState } from "react";

export const useTime = (withSeconds = false,hour24=false) => {
  const locale = "en"; // maybe used later for internationalization or something
  const [now, setNow] = useState(new Date()); // Save the current date to be able to trigger an update

  useEffect(() => {
    const timer = setInterval(() => {
      // Creates an interval which will update the current data every second
      // This will trigger a rerender every component that uses the useDate hook.
      setNow(new Date());
    }, 1 * 1000); // change 1 to 60 to update every minute
    return () => {
      clearInterval(timer); // Return a funtion to clear the timer so that it will stop being called on unmount
    };
  }, []);

  const day = now.toLocaleDateString(locale, { weekday: "long" });
  const date = now.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const time = withSeconds
    ? now.toLocaleTimeString(locale, { hour: "numeric", hour12: hour24?false:true, minute: "numeric", second: "2-digit" })
    : now.toLocaleTimeString(locale, { hour: "numeric", hour12: true, minute: "numeric"});

  return {
    day,
    date,
    time,
  };
};
