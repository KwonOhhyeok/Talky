/**
 * 에러 유형을 분류하여 사용자 친화적 메시지와 복구 행동을 반환합니다.
 * @param {unknown} err
 * @returns {{ type: string, title: string, message: string, actions: string[] }}
 */
export function classifyError(err) {
  const name = err?.name ?? "";
  const message = (err?.message ?? "").toLowerCase();

  if (name === "NotAllowedError" || message.includes("notallowederror")) {
    return {
      type: "mic-denied",
      title: "마이크 권한 필요",
      message: "마이크 접근 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.",
      actions: ["retry"],
    };
  }

  if (message.includes("microphone") && message.includes("timed out")) {
    return {
      type: "mic-timeout",
      title: "마이크 연결 시간 초과",
      message: "마이크 연결에 시간이 너무 걸렸습니다. 마이크가 연결되어 있는지 확인해 주세요.",
      actions: ["retry"],
    };
  }

  if (message.includes("token request") && message.includes("timed out")) {
    return {
      type: "network-timeout",
      title: "인터넷 연결 불안정",
      message: "인터넷 연결이 불안정합니다. 네트워크를 확인하고 다시 시도해 주세요.",
      actions: ["retry"],
    };
  }

  if (message.includes("timed out") || message.includes("timeout") || name === "AbortError") {
    return {
      type: "timeout",
      title: "연결 시간 초과",
      message: "서버 연결에 시간이 너무 걸렸습니다. 잠시 후 다시 시도해 주세요.",
      actions: ["retry"],
    };
  }

  if (message.includes("token request failed") || message.includes("status 5")) {
    return {
      type: "server-error",
      title: "서버 오류",
      message: "서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.",
      actions: ["retry"],
    };
  }

  if (message.includes("websocket") || message.includes("connect")) {
    return {
      type: "websocket-error",
      title: "음성 서버 연결 실패",
      message: "음성 서버 연결에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.",
      actions: ["retry"],
    };
  }

  return {
    type: "unknown",
    title: "오류 발생",
    message: "예기치 못한 오류가 발생했습니다. 다시 시도해 주세요.",
    actions: ["retry"],
  };
}

/**
 * 세션이 WebSocket으로 끊겼을 때의 에러 정보를 반환합니다.
 */
export function getDisconnectedError() {
  return {
    type: "disconnected",
    title: "연결 끊김",
    message: "연결이 끊어졌습니다. 다시 시도해 주세요.",
    actions: ["retry"],
  };
}
