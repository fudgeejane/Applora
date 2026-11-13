import { useDarkMode } from "./useDarkMode";

export function useStyle() {
  const { isDarkMode } = useDarkMode();
  const darkMode = isDarkMode;

  const primaryBg = darkMode ? "bg-[#121212]" : "bg-[#F5F5F5]";
  const secondaryBg = darkMode ? "bg-[#1E1E1E]" : "bg-[#FFFFFF]";
  const border = darkMode ? "border-[#333333]" : "border-[#CCCCCC]";
  const primaryText = darkMode ? "text-[#E0E0E0]" : "text-[#333333]";
  const secondaryText = darkMode ? "text-[#B0B0B0]" : "text-[#666666]";
  const tertiaryText = darkMode ? "text-[#8A8A8A]" : "text-[#999999]";
  const buttonBlue = `cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white ${
    darkMode ? "bg-blue-700 hover:bg-blue-800" : "bg-blue-600 hover:bg-blue-500"
  }`;

  return {
    isDarkMode,

    // Backgrounds
    primaryBg,
    secondaryBg,
    cardBg: secondaryBg,
    inputBg: darkMode ? "bg-[#292928]" : "bg-[#FAFAFA]",
    headerBg: darkMode ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]",
    primaryBgHover: darkMode ? "hover:bg-[#1a1a1a]" : "hover:bg-[#f0f0f0]",
    secondaryBgHover: darkMode ? "hover:bg-[#292929]" : "hover:bg-[#f5f5f5]",
    headerHover: darkMode ? "hover:bg-[#2e2e2e]" : "hover:bg-[#f5f5f5]",
    blueGradient: "bg-gradient-to-r from-[#161647] to-[#1d1d63]",

    // Table
    tableBg: secondaryBg,
    tableWrapper: `overflow-x-auto rounded-lg border ${border} ${secondaryBg}`,
    tableHeader: `${darkMode ? "bg-[#1A1A1A]" : "bg-[#FAFAFA]"} border-b-2 ${
      darkMode ? "border-[#444444]" : "border-[#BBBBBB]"
    }`,
    tableHeaderCell: `px-4 py-3 text-left text-sm font-semibold ${primaryText}`,
    tableBody: `divide-y ${darkMode ? "divide-[#333333]" : "divide-[#CCCCCC]"}`,
    tableRow: `transition-colors ${
      darkMode ? "hover:bg-[#292929]" : "hover:bg-[#f5f5f5]"
    }`,
    tableCell: `px-4 py-3 text-sm ${secondaryText}`,

    // Text
    primaryText,
    secondaryText,
    tertiaryText,
    mutedText: tertiaryText,
    headingText: primaryText,
    primaryTexHover: darkMode ? "hover:text-white" : "hover:text-gray-800",
    blueText: darkMode ? "text-blue-500" : "text-blue-800",
    greenText: "text-green-500",
    grayText: darkMode ? "text-gray-500" : "text-gray-600",
    orangeText: "text-orange-400",
    purpleText: darkMode ? "text-purple-400" : "text-purple-600",
    yellowText: darkMode ? "text-yellow-100" : "text-yellow-700",
    redText: darkMode ? "text-red-500" : "text-red-700",

    // Borders and dividers
    border,
    borderLight: darkMode ? "border-[#333333]" : "border-[#CCCCCC]",
    borderDark: darkMode ? "border-[#333333]" : "border-[#CCCCCC]",
    inputBorder: darkMode ? "border-[#3C3C3C]" : "border-[#DDDDDD]",
    blueBorder: darkMode ? "border-blue-700/30" : "border-blue-500",
    greenBorder: darkMode ? "border-green-700/30" : "border-green-300",
    grayBorder: darkMode ? "border-gray-500" : "border-gray-300",
    purpleBorder: darkMode ? "border-purple-900" : "border-purple-300",
    redBorder: darkMode ? "border-red-900" : "border-red-400",
    yellowBorder: darkMode ? "border-yellow-900" : "border-yellow-400",
    divider: border,
    divide: darkMode ? "divide-[#333333]" : "divide-[#CCCCCC]",
    cardBorder: border,

    // Hovers and tabs
    hoverBg: darkMode ? "hover:bg-[#292929]" : "hover:bg-[#f0f0f0]",
    tabHover: darkMode
      ? "hover:bg-gray-700 text-gray-100"
      : "hover:bg-blue-100 text-gray-700",
    activeTab: `font-semibold border-b-2 ${
      darkMode
        ? "border-blue-400 bg-gray-800 text-gray-100"
        : "border-blue-600 bg-blue-200/70 text-blue-700"
    }`,
    blueHover: darkMode ? "hover:bg-blue-800/50" : "hover:bg-blue-50",
    blueBg2hover: darkMode
      ? "hover:bg-blue-500/10 hover:border-blue-900"
      : "hover:bg-blue-200/50 hover:border-blue-300",
    purpleBg2hover: darkMode
      ? "hover:bg-purple-500/10 hover:border-purple-900"
      : "hover:bg-purple-200/50 hover:border-purple-300",

    // Inputs and buttons
    input: `focus:outline-none focus:ring-0 ${
      darkMode
        ? "bg-[#292928] border-[#3C3C3C] text-[#C9C9C9]"
        : "bg-[#FAFAFA] border-[#DDDDDD] text-[#333333]"
    }`,
    inputFocus: "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
    inputPlaceholder: darkMode
      ? "placeholder:text-gray-500"
      : "placeholder:text-gray-400",
    button: buttonBlue,
    buttonBlue,
    buttonGreen: `cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-green-700 hover:bg-green-800" : "bg-green-600 hover:bg-green-500"
    }`,
    buttonBlue2: `cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
      darkMode
        ? "bg-blue-500/20 border-blue-800 text-[#E0E0E0] enabled:hover:bg-blue-800"
        : "bg-blue-200/50 border-blue-300 text-[#333333] enabled:hover:bg-blue-400"
    }`,
    buttonRed: `cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-red-700 hover:bg-red-800" : "bg-red-500 hover:bg-red-400"
    }`,
    buttonGray: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed ${
      darkMode
        ? "bg-gray-600 hover:bg-gray-700 text-white"
        : "bg-gray-200 hover:bg-gray-300 text-gray-600"
    }`,
    buttonPurple: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-500"
    }`,
    buttonYellow: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-yellow-600 hover:bg-yellow-700" : "bg-yellow-500 hover:bg-yellow-400"
    }`,
    buttonOrange: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-orange-600 hover:bg-orange-700" : "bg-orange-400 hover:bg-orange-500"
    }`,
    buttonTeal: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-teal-600 hover:bg-teal-700" : "bg-teal-400 hover:bg-teal-500"
    }`,
    buttonIndigo: `cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed text-white ${
      darkMode ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-400 hover:bg-indigo-500"
    }`,
    primaryButton: buttonBlue,
    secondaryButton: `border ${border} ${
      darkMode
        ? "text-[#C9C9C9] hover:bg-[#292929]"
        : "text-[#333333] hover:bg-[#f0f0f0]"
    }`,
    dangerButton: "bg-red-600 text-white hover:bg-red-700",
    closeButton: `font-extrabold cursor-pointer ${
      darkMode
        ? "text-gray-400 hover:text-red-400"
        : "text-gray-400 hover:text-red-500"
    }`,

    // Cards and menus
    card: `rounded-2xl border ${border} ${secondaryBg}`,
    cardShadow: darkMode
      ? "shadow-[0_2px_6px_rgba(60,60,60,0.45)]"
      : "shadow-[0_2px_6px_rgba(0,0,0,0.15)]",
    dropdownBg: `border ${border} ${secondaryBg} shadow-xl`,
    shadow: darkMode
      ? "shadow-[0_2px_6px_rgba(60,60,60,0.45)]"
      : "shadow-[0_2px_6px_rgba(0,0,0,0.15)]",
    gamingBg: darkMode
      ? "bg-gradient-to-r from-purple-700 via-blue-700 to-black/20"
      : "bg-gradient-to-r from-purple-400 via-blue-400 to-white",
    navBg: darkMode
      ? "bg-gray-800 hover:bg-gray-700 text-white"
      : "bg-gray-200 hover:bg-gray-300 text-gray-600",

    // Colored backgrounds
    yellowBg: darkMode ? "bg-yellow-700/30" : "bg-yellow-100",
    yellowBg2: darkMode ? "bg-yellow-500/20" : "bg-yellow-200/50",
    redBg: darkMode ? "bg-red-600 text-white" : "bg-red-400 text-white",
    redBg2: darkMode ? "bg-red-500/20" : "bg-red-200/50",
    blueBg: darkMode ? "bg-blue-500/20" : "bg-blue-500",
    blueBg2: darkMode ? "bg-blue-500/20" : "bg-blue-200/50",
    greenBg: "bg-green-600 text-white",
    greenBg2: darkMode ? "bg-green-500/20" : "bg-green-200/50",
    grayBg: darkMode ? "bg-[#242526]/90" : "bg-gray-100",
    grayBg2: darkMode ? "bg-gray-500/10" : "bg-gray-200/50",
    purpleBg2: darkMode ? "bg-purple-500/10" : "bg-purple-200/50",
    correct: darkMode
      ? "bg-green-400/50 text-white"
      : "bg-green-200/50 text-gray-600",
    wrong: darkMode ? "bg-red-400/70 text-white" : "bg-red-200/50",
    coorectText: darkMode ? "text-green-200" : "text-green-700",

    // Navigation
    navText: `transition ${
      darkMode ? "text-[#B0B0B0] hover:text-white" : "text-[#666666] hover:text-blue-600"
    }`,
    navActive: darkMode ? "text-blue-400" : "text-blue-600",
  };
}