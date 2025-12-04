import { redirect } from 'next/navigation'

export const runtime = 'edge'

export default function InstitutionPage({
  params,
}: {
  params: { institutionname: string }
}) {
  redirect(`/${params.institutionname}/overview`)
}
