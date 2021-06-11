import React, {
  createContext,
  FunctionComponent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { ExposureKey } from "./exposureKey"
import { ExposureInfo } from "./exposure"
import { useProductAnalyticsContext } from "./ProductAnalytics/Context"
import * as NativeModule from "./gaen/nativeModule"
import { useConfigurationContext } from "./ConfigurationContext"
import env from "react-native-config"
import { calculateHmac } from "./AffectedUserFlow/hmac"
import { postDiagnosisKeys } from "./AffectedUserFlow/exposureNotificationAPI"

type Posix = number

export interface ExposureState {
  exposureInfo: ExposureInfo
  getCurrentExposures: () => Promise<ExposureInfo>
  getExposureKeys: () => Promise<ExposureKey[]>
  getRevisionToken: () => Promise<string>
  lastExposureDetectionDate: Posix | null
  storeRevisionToken: (revisionToken: string) => Promise<void>
  refreshExposureInfo: () => void
  detectExposures: () => Promise<NativeModule.DetectExposuresResponse>
}

const initialState = {
  exposureInfo: [],
  getCurrentExposures: () => {
    return Promise.resolve([])
  },
  getExposureKeys: () => {
    return Promise.resolve([])
  },
  getRevisionToken: () => {
    return Promise.resolve("")
  },
  lastExposureDetectionDate: null,
  storeRevisionToken: () => {
    return Promise.resolve()
  },
  refreshExposureInfo: () => {},
  detectExposures: () => {
    return Promise.resolve({ kind: "success" as const })
  },
}

export const ExposureContext = createContext<ExposureState>(initialState)

const ExposureProvider: FunctionComponent = ({ children }) => {
  const { trackEvent } = useProductAnalyticsContext()
  const { proxyOtp } = useConfigurationContext()

  const [exposureInfo, setExposureInfo] = useState<ExposureInfo>([])

  const [
    lastExposureDetectionDate,
    setLastExposureDetectionDate,
  ] = useState<Posix | null>(null)

  const getLastExposureDetectionDate = useCallback(() => {
    NativeModule.fetchLastExposureDetectionDate().then((detectionDate) => {
      setLastExposureDetectionDate(detectionDate)
    })
  }, [])

  const refreshExposureInfo = useCallback(async () => {
    const exposureInfo = await NativeModule.getCurrentExposures()
    setExposureInfo(exposureInfo)

    const detectionDate = await NativeModule.fetchLastExposureDetectionDate()
    setLastExposureDetectionDate(detectionDate)
  }, [])

  useEffect(() => {
    const subscription = NativeModule.subscribeToExposureEvents(
      (exposureInfo: ExposureInfo) => {
        setExposureInfo(exposureInfo)
        getLastExposureDetectionDate()
      },
    )
    getLastExposureDetectionDate()

    return () => {
      subscription.remove()
    }
  }, [getLastExposureDetectionDate])

  useEffect(() => {
    const subscription = NativeModule.subscribeToExposureEvents(() => {
      if (proxyOtp) {
        ;(async () => {
          const exposureKeys = await NativeModule.getExposureKeys()
          console.log("keys", exposureKeys)
          const regionCodes = env.REGION_CODES.split(",")
          console.log("regionCodes", regionCodes)
          const certificate = proxyOtp
          console.log("certificate", certificate)
          const [hmacDigest, hmacKey] = await calculateHmac(exposureKeys)
          console.log("hmac", hmacDigest, hmacKey)
          const appPackageName = env.ANDROID_APPLICATION_ID
          console.log("appPackageName", appPackageName)
          const revisionToken = await NativeModule.getRevisionToken()
          console.log("revisionToken", revisionToken)
          const symptomOnsetDate = 0
          console.log("symptomOnsetDate", symptomOnsetDate)

          const response = await postDiagnosisKeys(
            exposureKeys,
            regionCodes,
            certificate,
            hmacKey,
            appPackageName,
            revisionToken,
            symptomOnsetDate,
          )
          console.log(response)
        })()
      }

      trackEvent("epi_analytics", "en_notification_received")
    })

    return () => {
      subscription.remove()
    }
  }, [trackEvent])

  const detectExposures = async (): Promise<NativeModule.DetectExposuresResponse> => {
    const response = await NativeModule.detectExposures()
    if (response.kind === "success") {
      await refreshExposureInfo()
    }
    return response
  }

  return (
    <ExposureContext.Provider
      value={{
        exposureInfo,
        lastExposureDetectionDate,
        refreshExposureInfo,
        detectExposures,
        getCurrentExposures: NativeModule.getCurrentExposures,
        getExposureKeys: NativeModule.getExposureKeys,
        getRevisionToken: NativeModule.getRevisionToken,
        storeRevisionToken: NativeModule.storeRevisionToken,
      }}
    >
      {children}
    </ExposureContext.Provider>
  )
}

const useExposureContext = (): ExposureState => {
  const context = useContext(ExposureContext)
  if (context === undefined) {
    throw new Error("ExposureContext must be used with a provider")
  }
  return context
}

export { ExposureProvider, useExposureContext }
