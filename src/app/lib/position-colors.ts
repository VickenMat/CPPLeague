export function positionTextClass(position: string) {
  switch (position.toUpperCase()) {
    case "QB":
      return "text-[#F87171]";
    case "WR":
      return "text-[#60A5FA]";
    default:
      return "";
  }
}
