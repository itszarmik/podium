import { Share, Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'

const APP_URL = 'https://podium-web-two.vercel.app'

export async function shareBoard(board) {
  const url = board.inviteCode ? `${APP_URL}/join/${board.inviteCode}` : `${APP_URL}/board/${board.id}`
  const msg = board.inviteCode
    ? `Join me on "${board.name}" — a live leaderboard on Podium! Use code ${board.inviteCode} or tap: ${url}`
    : `Check out "${board.name}" on Podium — live leaderboards, real-time rankings: ${url}`
  try {
    await Share.share(Platform.OS === 'ios' ? { url, message: msg, title: `Join ${board.name} on Podium` } : { message: msg, title: `Join ${board.name} on Podium` }, { dialogTitle: `Share ${board.name}` })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {}
}

export async function copyInviteCode(code) {
  await Clipboard.setStringAsync(code)
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}

export async function copyBoardLink(boardId, inviteCode) {
  const url = inviteCode ? `${APP_URL}/join/${inviteCode}` : `${APP_URL}/board/${boardId}`
  await Clipboard.setStringAsync(url)
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}
