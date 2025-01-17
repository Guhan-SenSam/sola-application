export const numberFormatter = (num: number | string): string => {
    if (typeof num === 'string') {
      num = Number(num);
    }
  
    if (isNaN(num)) {
      return "Invalid Number";
    }
  
    const absNum = Math.abs(num); 
  
    if (absNum >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B";
    }
  
    if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
  
    if (absNum >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
  
      if (absNum < 1 && absNum > 0) {
          return num.toFixed(3)
      }
  
    return num.toString();
  };