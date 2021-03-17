import React, { FunctionComponent } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import ExternalLink from './ExternalLink'
import { Text } from '../components'
import { useStatusBarEffect } from '../navigation'

import { Colors, Spacing, Typography } from '../styles'

const Contact: FunctionComponent = () => {
  useStatusBarEffect('dark-content', Colors.background.primaryLight)
  const { t } = useTranslation()

  return (
    <ScrollView style={style.container} alwaysBounceVertical={false}>
      <View style={style.contentText}>
        <Text>{t('settings.call_center')}</Text>
        <ExternalLink
          url={"tel:22572610"}
          label={"22572610"}
        />
      </View>

      <View style={style.contentText}>
        <Text>{t('settings.website')}</Text>
        <ExternalLink
          url={"https://covtracer.dmrid.gov.cy/"}
          label={"https://covtracer.dmrid.gov.cy/"}
        />
      </View>
    </ScrollView>
  )
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primaryLight,
    paddingTop: Spacing.large,
    paddingHorizontal: Spacing.small,
  },
  contentText: {
    ...Typography.body.x30,
    marginBottom: Spacing.xxxLarge,
  }
})

export default Contact
