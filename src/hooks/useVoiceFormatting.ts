import { useMemo } from "react";
import { CountryCode, VoiceId } from "@diffusionstudio/vits-web";

type FormattedVoice = {
  id: VoiceId;
  flag: string;
  name: string;
  quality: {
    text: string;
    color: string;
  };
};

const getFlag = (locale: string): string => {
  const flagEmojis: Record<CountryCode, string> = {
    ar_JO: "🇯🇴",
    ca_ES: "🇪🇸",
    cs_CZ: "🇨🇿",
    da_DK: "🇩🇰",
    de_DE: "🇩🇪",
    el_GR: "🇬🇷",
    en_GB: "🇬🇧",
    en_US: "🇺🇸",
    es_ES: "🇪🇸",
    es_MX: "🇲🇽",
    fa_IR: "🇮🇷",
    fi_FI: "🇫🇮",
    fr_FR: "🇫🇷",
    hu_HU: "🇭🇺",
    is_IS: "🇮🇸",
    it_IT: "🇮🇹",
    ka_GE: "🇬🇪",
    kk_KZ: "🇰🇿",
    lb_LU: "🇱🇺",
    ne_NP: "🇳🇵",
    nl_BE: "🇧🇪",
    nl_NL: "🇳🇱",
    no_NO: "🇳🇴",
    pl_PL: "🇵🇱",
    pt_BR: "🇧🇷",
    pt_PT: "🇵🇹",
    ro_RO: "🇷🇴",
    ru_RU: "🇷🇺",
    sk_SK: "🇸🇰",
    sl_SI: "🇸🇮",
    sr_RS: "🇷🇸",
    sv_SE: "🇸🇪",
    sw_CD: "🇨🇩",
    tr_TR: "🇹🇷",
    uk_UA: "🇺🇦",
    vi_VN: "🇻🇳",
    zh_CN: "🇨🇳",
  };
  return flagEmojis[locale as CountryCode] || "🏳️";
};

const getQualityColor = (quality: string): string => {
  switch (quality.toLowerCase()) {
    case "x_low":
      return "text-red-800";
    case "low":
      return "text-red-500";
    case "medium":
      return "text-orange-500";
    case "high":
      return "text-green-500";
    default:
      return "text-gray-500";
  }
};

export const useVoiceFormatting = (voices: VoiceId[]): FormattedVoice[] => {
  const formattedVoices = useMemo(() => {
    return voices
      .filter((voice) => voice.startsWith("en_"))
      .map((voice) => {
        const [locale, name, quality] = voice.split("-");
        return {
          id: voice,
          flag: getFlag(locale || "en_US"),
          name: (name?.charAt(0)?.toUpperCase() ?? "") + (name?.slice(1) ?? "") || "Unknown",
          quality: {
            text: (quality?.charAt(0)?.toUpperCase() ?? "") + (quality?.slice(1) ?? "") || "Unknown",
            color: getQualityColor(quality || "Unknown"),
          },
        };
      });
  }, [voices]);

  return formattedVoices;
};
