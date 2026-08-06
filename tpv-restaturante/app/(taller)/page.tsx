import { redirect } from 'next/navigation'
import { routeFor } from '../../modules/core/view-routes'

export default function TallerIndex() {
  redirect(routeFor('salon'))
}