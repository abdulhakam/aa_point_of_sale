'use client'
import React from "react";

export const useDate = () => {
  const locale = "en";

  const [today, setDate] = React.useState(new Date()); // Save the current date to be able to trigger an update

  React.useEffect(() => {
      const timer = setInterval(() => { // Creates an interval which will update the current data every second
      // This will trigger a rerender every component that uses the useDate hook.
      setDate(new Date());
    }, 1 * 1000);// change 1 to 60 to update every minute
    return () => {
      clearInterval(timer); // Return a funtion to clear the timer so that it will stop being called on unmount
    }
  }, []);

  const day = today.toLocaleDateString(locale, { weekday: "long" });
  const date = `${day}, ${today.toLocaleDateString(locale, { day:'numeric',month:'short', year:'numeric' })}\n\n`;

  const time = today.toLocaleTimeString(locale, { hour: "numeric", hour12: true, minute: "numeric"});

  return {
    date,
    time
  };
};

export const TimeDisplay = () => {
  const { date, time } = useDate();
  return (
    <div>
      <span>
        {`${date}, ${time}`}
      </span>
    </div>
  );
};

