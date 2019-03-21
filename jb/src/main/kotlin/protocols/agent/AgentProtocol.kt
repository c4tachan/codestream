package protocols.agent

import com.codestream.Codemark
import com.codestream.TextDocument
import com.google.gson.annotations.SerializedName
import org.eclipse.lsp4j.Range
import org.eclipse.lsp4j.ServerCapabilities
import java.lang.IllegalStateException

abstract class LoginParams(
    val email: String?,
    val passwordOrToken: Any?,
    val signupToken: String?,
    val serverUrl: String,
    val extension: Extension,
    val ide: Ide,
    val traceLevel: TraceLevel,
    val isDebugging: Boolean
//    val team: String?,
//    val teamId: String,
)

class LoginWithPasswordParams(
    email: String?,
    password: String?,
    serverUrl: String,
    extension: Extension,
    ide: Ide,
    traceLevel: TraceLevel,
    isDebugging: Boolean
) : LoginParams(
    email,
    password,
    null,
    serverUrl,
    extension,
    ide,
    traceLevel,
    isDebugging
)

class LoginWithSignupTokenParams(
    signupToken: String,
    serverUrl: String,
    extension: Extension,
    ide: Ide,
    traceLevel: TraceLevel,
    isDebugging: Boolean
) : LoginParams(
    null,
    null,
    signupToken,
    serverUrl,
    extension,
    ide,
    traceLevel,
    isDebugging
)

class LoginResult(
    val capabilities: ServerCapabilities,
    val result: LoginResultDetails
)

class LoginResultDetails(
    val error: String?,
    val state: LoginState?,
    val loginResponse: LoginResponse?
) {
    val userLoggedIn: UserLoggedIn
        get() = loginResponse?.let {
            return UserLoggedIn(it.user, it.team, state!!, it.teams.size)
        } ?: throw IllegalStateException("LoginResult has no loginResponse")
}

class LoginResponse(
    val user: CSUser,
    val teamId: String,
    val teams: List<CSTeam>
) {
    val team: CSTeam
        get() = teams.find { it.id == teamId }
            ?: throw IllegalStateException("User's teams does not contains their own team")
}

class LoginState {
    lateinit var userId: String
    lateinit var teamId: String
    lateinit var email: String
}

class UserLoggedIn(val user: CSUser, val team: CSTeam, val state: LoginState, val teamsCount: Int)

class CSUser {
    @SerializedName("_id")
    lateinit var id: String
    lateinit var username: String
    lateinit var email: String
}

class CSTeam {
    @SerializedName("_id")
    lateinit var id: String
    lateinit var name: String
}

class BootstrapParams

class LogoutParams

class Extension

class Ide

class AccessToken(
    val email: String?,
    val url: String,
    val value: String
)

enum class TraceLevel {
    @SerializedName("silent")
    SILENT,
    @SerializedName("errors")
    ERRORS,
    @SerializedName("verbose")
    VERBOSE,
    @SerializedName("debug")
    DEBUG
}

class DocumentMarkersParams(val textDocument: TextDocument)

class DocumentMarkersResult(val markers: List<DocumentMarker>, val markersNotLocated: Any)

class DocumentMarker(
    val codemark: Codemark,
//    creatorName: string;
    val range: Range,
    val summary: String
//    summaryMarkdown: string;
)