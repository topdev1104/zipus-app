import { Redirect } from "react-router-dom"
import { RouteComponentProps } from "react-router-dom"

export function RedirectPathToHomeOnly({ location }: RouteComponentProps) {
    return <Redirect to={{ ...location, pathname: '/' }} />
  }