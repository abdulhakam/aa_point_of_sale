'use client'
import React from "react";

export const useDate = () => {
  const locale = "en";

  const [today, setDate] = React.useState(new Date()); // Save the current date to be able to trigger an update
  const [hasMounted, setHasMounted] = React.useState(false); // Save the mounting status of the component

  React.useEffect(() => {
      setHasMounted(true); // Set the mounting status to true after the component mounts on the client
      const timer = setInterval(() => { // Creates an interval which will update the current data every second
      // This will trigger a rerender every component that uses the useDate hook.
      setDate(new Date());
    }, 1 * 1000);// change 1 to 60 to update every minute
    return () => {
      clearInterval(timer); // Return a funtion to clear the timer so that it will stop being called on unmount
    }
  }, []);

  // Return null if the component has not mounted on the client yet
  if (!hasMounted) {
    return {day:"",date:"",time:""};
  }

  const day = today.toLocaleDateString(locale, { weekday: "long" });
  const date = `${today.toLocaleDateString(locale, { day:'numeric',month:'short', year:'numeric' })}\n\n`;
  const time = today.toLocaleTimeString(locale, { hour: "numeric", hour12: true, minute: "numeric", second:'2-digit'});

  return {
    day,
    date,
    time
  };
};

export const TimeDisplay = () => {
  const { date, time } = useDate();
  return (
      <span>
        {`${date}, ${time}`}
      </span>
  );
};

